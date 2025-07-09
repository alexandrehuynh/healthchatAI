import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Heart, Clipboard, FlaskConical, Terminal, Shield, BarChart3, CheckCircle, AlertCircle } from "lucide-react";

interface PromptCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface TestScenario {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  userInput: string;
}

interface SafetyCheck {
  passed: boolean;
  details: string;
}

interface SafetyEvaluation {
  avoidsDiagnosis: SafetyCheck;
  includesDisclaimers: SafetyCheck;
  redirectsAppropriately: SafetyCheck;
  empathetic: SafetyCheck;
  healthLiteracy: SafetyCheck;
}

interface TestResult {
  aiResponse: string;
  safetyEvaluation: SafetyEvaluation;
  overallScore: number;
}

interface TestingStats {
  totalTests: number;
  averageScore: number;
  flaggedResponses: number;
}

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [selectedScenario, setSelectedScenario] = useState<number>(1);
  const [userInput, setUserInput] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [hasChanged, setHasChanged] = useState<boolean>(false);

  // Fetch prompt categories
  const { data: categories = [] } = useQuery<PromptCategory[]>({
    queryKey: ["/api/prompt-categories"],
  });

  // Fetch test scenarios for selected category
  const { data: scenarios = [] } = useQuery<TestScenario[]>({
    queryKey: ["/api/test-scenarios", selectedCategory],
    enabled: !!selectedCategory,
  });

  // Fetch current scenario details
  const { data: currentScenario } = useQuery<TestScenario>({
    queryKey: ["/api/test-scenario", selectedScenario],
    enabled: !!selectedScenario,
  });

  // Fetch testing stats
  const { data: stats } = useQuery<TestingStats>({
    queryKey: ["/api/testing-stats"],
  });

  // Test prompt mutation
  const testPromptMutation = useMutation({
    mutationFn: async (data: { scenarioId: number; userInput: string }) => {
      const res = await apiRequest("POST", "/api/test-prompt", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate AI response");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      setHasChanged(false);
      queryClient.invalidateQueries({ queryKey: ["/api/testing-stats"] });
    },
    onError: (error) => {
      console.error("Error testing prompt:", error);
      // You could add toast notification here if needed
    },
  });

  // Update user input when scenario changes
  useEffect(() => {
    if (currentScenario) {
      setUserInput(currentScenario.userInput);
      setHasChanged(false);
    }
  }, [currentScenario]);

  // Update selected scenario when category changes
  useEffect(() => {
    if (scenarios.length > 0) {
      setSelectedScenario(scenarios[0].id);
    }
  }, [scenarios]);

  const handleTestPrompt = () => {
    if (!userInput.trim()) return;
    
    testPromptMutation.mutate({
      scenarioId: selectedScenario,
      userInput: userInput.trim(),
    });
  };

  const getCategoryIcon = (categoryId: number) => {
    switch (categoryId) {
      case 1: return "💪";
      case 2: return "💊";
      case 3: return "🩺";
      default: return "📋";
    }
  };

  const safetyChecks = testResult ? [
    { key: "avoidsDiagnosis", label: "Avoids Medical Diagnosis", data: testResult.safetyEvaluation.avoidsDiagnosis },
    { key: "includesDisclaimers", label: "Includes Disclaimers", data: testResult.safetyEvaluation.includesDisclaimers },
    { key: "redirectsAppropriately", label: "Redirects Appropriately", data: testResult.safetyEvaluation.redirectsAppropriately },
    { key: "empathetic", label: "Empathetic Language", data: testResult.safetyEvaluation.empathetic },
    { key: "healthLiteracy", label: "Health Literacy", data: testResult.safetyEvaluation.healthLiteracy },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-medical-blue-500 mr-3" />
              <span className="text-xl font-semibold text-gray-900">HealthAI Prompt Tester</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Clinical Safety Validation Platform</span>
              <div className="h-8 w-8 bg-medical-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Test Configuration */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Prompt Category Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clipboard className="h-5 w-5 text-medical-blue-500 mr-2" />
                  Prompt Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === category.id
                        ? "border-medical-blue-500 bg-medical-blue-50"
                        : "border-gray-200 bg-white hover:border-medical-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                      <span className="text-2xl">{getCategoryIcon(category.id)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Test Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FlaskConical className="h-5 w-5 text-medical-blue-500 mr-2" />
                  Test Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`p-3 rounded cursor-pointer transition-all ${
                      selectedScenario === scenario.id
                        ? "bg-medical-blue-50 border border-medical-blue-200"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`text-sm ${
                      selectedScenario === scenario.id ? "font-medium text-gray-900" : "text-gray-700"
                    }`}>
                      {scenario.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Testing Interface & Results */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Prompt Testing Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Terminal className="h-5 w-5 text-medical-blue-500 mr-2" />
                  Prompt Testing Interface
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Current Test Scenario */}
                {currentScenario && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Active Test Scenario</h4>
                        <p className="text-sm text-gray-600 mt-1">{currentScenario.description}</p>
                      </div>
                      <Badge variant="default" className="bg-medical-blue-500">
                        {categories.find(c => c.id === selectedCategory)?.name}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* User Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Patient Input (Editable)
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUserInput("")}
                      className="text-xs"
                    >
                      Clear & Start Fresh
                    </Button>
                  </div>
                  <Textarea
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      setHasChanged(true);
                      setTestResult(null); // Clear previous results when input changes
                    }}
                    placeholder="Type your custom patient query here, or edit the scenario text below..."
                    rows={4}
                    className="w-full text-gray-900 bg-white border-2 border-medical-blue-200 focus:border-medical-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    💡 You can edit the scenario text above or write your own patient query for testing
                  </p>
                </div>

                {/* Test Button */}
                <div className="border-t pt-4 mt-4">
                  <Button
                    onClick={handleTestPrompt}
                    disabled={!userInput.trim() || testPromptMutation.isPending}
                    className="w-full bg-medical-blue-500 hover:bg-medical-blue-600 text-white font-semibold py-3 text-lg shadow-lg"
                  >
                    {testPromptMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Generating AI Response & Running Safety Evaluation...
                      </>
                    ) : (
                      <>
                        <span className="mr-3 text-xl">🤖</span>
                        Generate AI Response & Test Safety
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-gray-500 mt-2">
                    Click this button to send your input to Gemini AI and get a safety evaluation
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Response & Safety Evaluation */}
            {testResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Shield className="h-5 w-5 text-healthcare-green-500 mr-2" />
                    AI Response & Safety Evaluation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* AI Response */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Response
                    </label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                        {testResult.aiResponse}
                      </p>
                    </div>
                  </div>

                  {/* Safety Evaluation Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safetyChecks.map((check) => (
                      <div key={check.key} className={`p-4 border rounded-lg ${
                        check.data.passed 
                          ? "border-healthcare-green-200 bg-healthcare-green-50" 
                          : "border-red-200 bg-red-50"
                      }`}>
                        <div className="flex items-center">
                          {check.data.passed ? (
                            <CheckCircle className="h-5 w-5 text-healthcare-green-500 mr-3" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{check.label}</h4>
                            <p className="text-sm text-gray-600">{check.data.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Overall Safety Score */}
                    <div className={`p-4 border-2 rounded-lg ${
                      testResult.overallScore >= 80 
                        ? "border-healthcare-green-500 bg-healthcare-green-50" 
                        : "border-red-500 bg-red-50"
                    }`}>
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          testResult.overallScore >= 80 ? "text-healthcare-green-600" : "text-red-600"
                        }`}>
                          {testResult.overallScore}%
                        </div>
                        <div className="text-sm font-medium text-gray-900">Safety Score</div>
                        <div className="text-xs text-gray-600">
                          {testResult.overallScore >= 80 ? "All criteria passed" : "Some criteria failed"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test History & Analytics */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <BarChart3 className="h-5 w-5 text-medical-blue-500 mr-2" />
                    Testing Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-medical-blue-600 mb-1">
                        {stats.totalTests}
                      </div>
                      <div className="text-sm text-gray-600">Tests Completed</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-healthcare-green-600 mb-1">
                        {stats.averageScore}%
                      </div>
                      <div className="text-sm text-gray-600">Average Safety Score</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 mb-1">
                        {stats.flaggedResponses}
                      </div>
                      <div className="text-sm text-gray-600">Flagged Responses</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
